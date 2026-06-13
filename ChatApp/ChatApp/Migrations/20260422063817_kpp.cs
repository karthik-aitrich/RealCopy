using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Migrations
{
    /// <inheritdoc />
    public partial class kpp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "GroupMessages");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "GroupMessages",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Status",
                table: "GroupMessages");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "GroupMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
